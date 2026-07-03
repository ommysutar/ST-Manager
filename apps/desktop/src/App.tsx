import { RouterProvider } from "react-router";

import { SyncProvider } from "./components/sync/SyncProvider";
import { router } from "./app/router";

export function App() {
  return (
    <SyncProvider>
      <RouterProvider router={router} />
    </SyncProvider>
  );
}
