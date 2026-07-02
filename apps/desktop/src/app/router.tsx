import { createHashRouter, Navigate } from "react-router";

import { AppShell } from "./shell/AppShell";
import { StudiosPage } from "./studios/StudiosPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/studios" replace /> },
      { path: "studios", element: <StudiosPage /> },
    ],
  },
]);
