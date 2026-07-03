import { createHashRouter } from "react-router";

import { AppShell } from "./shell/AppShell";
import { ClientCreatePage } from "./clients/ClientCreatePage";
import { ClientEditPage } from "./clients/ClientEditPage";
import { ClientsPage } from "./clients/ClientsPage";
import { DashboardPage } from "./dashboard/DashboardPage";
import { StudiosPage } from "./studios/StudiosPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "studios", element: <StudiosPage /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "clients/new", element: <ClientCreatePage /> },
      { path: "clients/:id", element: <ClientEditPage /> },
    ],
  },
]);
