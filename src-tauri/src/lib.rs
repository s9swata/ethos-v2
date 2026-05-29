use std::sync::Arc;
use tokio::sync::{Mutex, watch};
use serde::Serialize;
use tauri::Manager;
use yt_dlp::Downloader;
use yt_dlp::VideoSelection;

fn sanitize_id(id: &str) -> Result<(), String> {
    if id.starts_with('-') {
        return Err("Invalid ID: must not start with '-'".into());
    }
    if id.contains('\n') || id.contains('\r') || id.contains('\0') {
        return Err("Invalid ID: contains control characters".into());
    }
    Ok(())
}

struct AppState {
    downloader: Arc<Mutex<Option<Downloader>>>,
    ready: watch::Receiver<bool>,
}

#[derive(Serialize)]
struct TrackInfoResponse {
    id: String,
    title: String,
    artist: String,
    duration: f64,
    start_time: f64,
    end_time: f64,
    url: String,
    thumbnail: String,
    webpage_url: String,
    direct_url: String,
    formats: Vec<AudioFormatResponse>,
}

#[derive(Serialize)]
struct AudioFormatResponse {
    url: String,
    ext: String,
    format: String,
    bitrate: f64,
}

#[derive(Serialize)]
struct PlaylistResponse {
    title: String,
    tracks: Vec<PlaylistTrackResponse>,
}

#[derive(Serialize)]
struct PlaylistTrackResponse {
    id: String,
    title: String,
    artist: String,
    duration: f64,
    thumbnail: String,
}

#[tauri::command]
async fn wait_for_downloader(
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut rx = state.ready.clone();
    while !*rx.borrow() {
        rx.changed().await.map_err(|_| "Setup cancelled".to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn fetch_track_info(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<TrackInfoResponse, String> {
    sanitize_id(&id)?;
    eprintln!("[yt-dlp] fetch_track_info id={id}");
    let guard = state.downloader.lock().await;
    let downloader = guard.as_ref().ok_or("Downloader not initialized")?;
    let url = format!("https://music.youtube.com/watch?v={}", id);
    let video = match downloader.fetch_video_infos(&url).await {
        Ok(v) => {
            eprintln!("[yt-dlp] fetch_track_info success id={id} title={}", v.title);
            v
        }
        Err(e) => {
            eprintln!("[yt-dlp] fetch_track_info error id={id} {e}");
            return Err(e.to_string());
        }
    };

    let best = video
        .best_audio_format()
        .or_else(|| video.best_audio_video_format().ok())
        .ok_or("No audio format found")?
        .clone();
    let audio_url = best.url().map_err(|e| e.to_string())?.clone();
    let ext = best
        .container
        .as_ref()
        .map(|c| format!("{}", c))
        .unwrap_or_else(|| "webm".to_string());

    Ok(TrackInfoResponse {
        id: video.id,
        title: video.title,
        artist: video.uploader
            .map(|u| u.trim_end_matches("VEVO").trim_end_matches("- Topic").trim().to_string())
            .unwrap_or_default(),
        duration: video.duration.unwrap_or(0) as f64,
        start_time: 0.0,
        end_time: 0.0,
        url: audio_url.clone(),
        thumbnail: video.thumbnail.unwrap_or_default(),
        webpage_url: video
            .webpage_url
            .unwrap_or_else(|| format!("https://music.youtube.com/watch?v={}", id)),
        direct_url: audio_url.clone(),
        formats: vec![AudioFormatResponse {
            url: audio_url,
            ext,
            format: best.format.clone(),
            bitrate: best
                .rates_info
                .audio_rate
                .map(|r| r.0)
                .unwrap_or(0.0),
        }],
    })
}

#[tauri::command]
async fn fetch_playlist(
    state: tauri::State<'_, AppState>,
    playlist_id: String,
) -> Result<PlaylistResponse, String> {
    sanitize_id(&playlist_id)?;
    eprintln!("[yt-dlp] fetch_playlist id={playlist_id}");
    let guard = state.downloader.lock().await;
    let downloader = guard.as_ref().ok_or("Downloader not initialized")?;
    let url = format!("https://music.youtube.com/playlist?list={}", playlist_id);
    let playlist = match downloader.fetch_playlist_infos(&url).await {
        Ok(p) => {
            eprintln!("[yt-dlp] fetch_playlist success id={playlist_id} title={} tracks={}", p.title, p.entries.len());
            p
        }
        Err(e) => {
            eprintln!("[yt-dlp] fetch_playlist error id={playlist_id} {e}");
            return Err(e.to_string());
        }
    };

    Ok(PlaylistResponse {
        title: playlist.title,
        tracks: playlist
            .entries
            .into_iter()
            .map(|e| PlaylistTrackResponse {
                id: e.id,
                title: e.title,
                artist: e.uploader
                    .map(|u| u.trim_end_matches("VEVO").trim_end_matches("- Topic").trim().to_string())
                    .unwrap_or_default(),
                duration: e.duration.unwrap_or(0.0),
                thumbnail: e.thumbnail.unwrap_or_default(),
            })
            .collect(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (ready_tx, ready_rx) = watch::channel(false);

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .manage(AppState {
            downloader: Arc::new(Mutex::new(None)),
            ready: ready_rx,
        })
        .setup(move |app| {
            let app_data = app.path().app_data_dir().expect("Failed to resolve app data dir");
            std::fs::create_dir_all(&app_data).ok();

            let state: tauri::State<'_, AppState> = app.state();
            let d = state.downloader.clone();
            let binaries_dir = app_data.join("bin");
            let downloads_dir = app_data.join("downloads");

            tauri::async_runtime::spawn(async move {
                let builder = match Downloader::with_new_binaries(binaries_dir, downloads_dir).await {
                    Ok(b) => {
                        eprintln!("[yt-dlp] binaries extracted, building downloader");
                        b
                    }
                    Err(e) => {
                        eprintln!("[yt-dlp] failed to extract binaries: {e}");
                        let _ = ready_tx.send(true);
                        return;
                    }
                };
                match builder.build().await {
                    Ok(downloader) => {
                        eprintln!("[yt-dlp] Downloader initialized successfully");
                        *d.lock().await = Some(downloader);
                    }
                    Err(e) => eprintln!("[yt-dlp] failed to build Downloader: {e}"),
                }
                let _ = ready_tx.send(true);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fetch_track_info,
            fetch_playlist,
            wait_for_downloader
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
