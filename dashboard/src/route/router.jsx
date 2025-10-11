import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../layout/root";
import Home from "../pages/home";
import Analytics from "../pages/analytics";
import ReportsSales from "../pages/reports-sales";
import ReportsLeads from "../pages/reports-leads";
import ReportsProject from "../pages/reports-project";
import ReportsTimesheets from "../pages/reports-timesheets";

import Proposalist from "../pages/proposal-list";
import ProposalView from "../pages/proposal-view";
import ProposalEdit from "../pages/proposal-edit";
import LeadsList from "../pages/leadsList";
import CustomersView from "../pages/customers-view";
import CustomersCreate from "../pages/customers-create";
import ProposalCreate from "../pages/proposal-create";
import LeadsView from "../pages/leads-view";
import LeadsCreate from "../pages/leads-create";
import PaymentList from "../pages/payment-list";
import PaymentView from "../pages/payment-view/";
import PaymentCreate from "../pages/payment-create";
import ProjectsList from "../pages/projects-list";
import ProjectsView from "../pages/projects-view";
import ProjectsCreate from "../pages/projects-create";

import LayoutAuth from "../layout/layoutAuth";
import LoginCreative from "../pages/login-creative";

import RequireAuth from "@/components/authentication/RequireAuth";

import { Navigate } from "react-router-dom";
import InvoicesList from "../pages/Invoices/invoices-list";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LayoutAuth />,
    children: [
      {
        index: true, // default child route for "/"
        element: <LoginCreative />,
      },
    ],
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: "dashboard",
        element: <Home />,
      },
      {
        path: "dashboards/analytics",
        element: <Analytics />,
      },
      {
        path: "reports/sales",
        element: <ReportsSales />,
      },
      {
        path: "reports/leads",
        element: <ReportsLeads />,
      },
      {
        path: "reports/project",
        element: <ReportsProject />,
      },
      {
        path: "reports/timesheets",
        element: <ReportsTimesheets />,
      },
      {
        path: "proposal/list",
        element: <Proposalist />,
      },
      {
        path: "proposal/view",
        element: <ProposalView />,
      },
      {
        path: "proposal/edit",
        element: <ProposalEdit />,
      },
      {
        path: "proposal/create",
        element: <ProposalCreate />,
      },
      {
        path: "payment/list",
        element: <PaymentList />,
      },
      {
        path: "payment/view",
        element: <PaymentView />,
      },
      {
        path: "facture/create",
        element: <PaymentCreate />,
      },
      {
        path: "invoices/list",
        element: <InvoicesList />,
      },
      {
        path: "leads/list",
        element: <LeadsList />,
      },
      {
        path: "leads/view",
        element: <LeadsView />,
      },
      {
        path: "leads/create",
        element: <LeadsCreate />,
      },
      {
        path: "projects/list",
        element: <ProjectsList />,
      },
      {
        path: "projects/view",
        element: <ProjectsView />,
      },
      {
        path: "projects/create",
        element: <ProjectsCreate />,
      },
    ],
  },
  // Fallback: if route not found, redirect to login
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
