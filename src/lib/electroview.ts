import { Electroview } from "electrobun/view";
import type { DesktopRPC } from "../shared/types";

const rpc = Electroview.defineRPC<DesktopRPC>({
  handlers: {
    requests: {},
    messages: {},
  },
});

const electroview = new Electroview({ rpc });

export { electroview, rpc };
