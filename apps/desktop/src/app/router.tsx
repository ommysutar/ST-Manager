import { createHashRouter } from "react-router";

import { AppShell } from "./shell/AppShell";
import { DashboardPage } from "./dashboard/DashboardPage";
import { StudiosPage } from "./studios/StudiosPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "studios", element: <StudiosPage /> },
    ],
  },
]);
