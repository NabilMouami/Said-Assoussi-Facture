export const menuList = [
  {
    id: 0,
    name: "dashboards",
    path: "#",
    icon: "feather-airplay",
    dropdownMenu: [
      {
        id: 1,
        name: "CRM",
        path: "/",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Analytics",
        path: "/dashboards/analytics",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 1,
    name: "reports",
    path: "#",
    icon: "feather-cast",
    dropdownMenu: [
      {
        id: 1,
        name: "Sales Report",
        path: "/reports/sales",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Leads Report",
        path: "/reports/leads",
        subdropdownMenu: false,
      },
      {
        id: 3,
        name: "Project Report",
        path: "/reports/project",
        subdropdownMenu: false,
      },
      {
        id: 4,
        name: "Timesheets Report",
        path: "/reports/timesheets",
        subdropdownMenu: false,
      },
    ],
  },

  {
    id: 4,
    name: "payment",
    path: "#",
    icon: "feather-dollar-sign",
    dropdownMenu: [
      {
        id: 1,
        name: "Payment",
        path: "/payment/list",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "List Factures",
        path: "/invoices/list",
        subdropdownMenu: false,
      },
      {
        id: 4,
        name: "Facture Creer",
        path: "/facture/create",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 5,
    name: "clients",
    path: "#",
    icon: "feather-users",
    dropdownMenu: [
      {
        id: 1,
        name: "Clients List",
        path: "/customers/list",
        subdropdownMenu: false,
      },

      {
        id: 2,
        name: "Client Creer",
        path: "/customers/create",
        subdropdownMenu: false,
      },
    ],
  },

  {
    id: 10,
    name: "authentication",
    path: "#",
    icon: "feather-power",
    dropdownMenu: [
      {
        id: 1,
        name: "login",
        path: "#",
        subdropdownMenu: [
          {
            id: 1,
            name: "Cover",
            path: "/authentication/login/cover",
          },
          {
            id: 2,
            name: "Minimal",
            path: "/authentication/login/minimal",
          },
          {
            id: 3,
            name: "Creative",
            path: "/authentication/login/creative",
          },
        ],
      },
      {
        id: 2,
        name: "register",
        path: "#",
        subdropdownMenu: [
          {
            id: 1,
            name: "Cover",
            path: "/authentication/register/cover",
          },
          {
            id: 2,
            name: "Minimal",
            path: "/authentication/register/minimal",
          },
          {
            id: 3,
            name: "Creative",
            path: "/authentication/register/creative",
          },
        ],
      },
      {
        id: 3,
        name: "Error 404",
        path: "#",
        subdropdownMenu: [
          {
            id: 1,
            name: "Cover",
            path: "/authentication/404/cover",
          },
          {
            id: 2,
            name: "Minimal",
            path: "/authentication/404/minimal",
          },
          {
            id: 3,
            name: "Creative",
            path: "/authentication/404/creative",
          },
        ],
      },
      {
        id: 4,
        name: "Reset Pass",
        path: "#",
        subdropdownMenu: [
          {
            id: 1,
            name: "Cover",
            path: "/authentication/reset/cover",
          },
          {
            id: 2,
            name: "Minimal",
            path: "/authentication/reset/minimal",
          },
          {
            id: 3,
            name: "Creative",
            path: "/authentication/reset/creative",
          },
        ],
      },
      {
        id: 5,
        name: "Verify OTP",
        path: "#",
        subdropdownMenu: [
          {
            id: 1,
            name: "Cover",
            path: "/authentication/verify/cover",
          },
          {
            id: 2,
            name: "Minimal",
            path: "/authentication/verify/minimal",
          },
          {
            id: 3,
            name: "Creative",
            path: "/authentication/verify/creative",
          },
        ],
      },
      {
        id: 6,
        name: "Maintenance",
        path: "#",
        subdropdownMenu: [
          {
            id: 1,
            name: "Cover",
            path: "/authentication/maintenance/cover",
          },
          {
            id: 2,
            name: "Minimal",
            path: "/authentication/maintenance/minimal",
          },
          {
            id: 3,
            name: "Creative",
            path: "/authentication/maintenance/creative",
          },
        ],
      },
    ],
  },
];
