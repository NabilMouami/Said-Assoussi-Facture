export const menuList = [
  // {
  //   id: 0,
  //   name: "dashboards",
  //   path: "#",
  //   icon: "feather-airplay",
  //   dropdownMenu: [
  //     {
  //       id: 1,
  //       name: "CRM",
  //       path: "/",
  //       subdropdownMenu: false,
  //     },
  //     {
  //       id: 2,
  //       name: "Analytics",
  //       path: "/dashboards/analytics",
  //       subdropdownMenu: false,
  //     },
  //   ],
  // },
  // {
  //   id: 1,
  //   name: "reports",
  //   path: "#",
  //   icon: "feather-cast",
  //   dropdownMenu: [
  //     {
  //       id: 1,
  //       name: "Sales Report",
  //       path: "/reports/sales",
  //       subdropdownMenu: false,
  //     },
  //     {
  //       id: 2,
  //       name: "Leads Report",
  //       path: "/reports/leads",
  //       subdropdownMenu: false,
  //     },
  //     {
  //       id: 3,
  //       name: "Project Report",
  //       path: "/reports/project",
  //       subdropdownMenu: false,
  //     },
  //     {
  //       id: 4,
  //       name: "Timesheets Report",
  //       path: "/reports/timesheets",
  //       subdropdownMenu: false,
  //     },
  //   ],
  // },

  {
    id: 2,
    name: "Facture",
    path: "#",
    icon: "feather-file-text",
    dropdownMenu: [
      {
        id: 1,
        name: "List Factures",
        path: "/invoices/list",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Facture Creer",
        path: "/facture/create",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 3,
    name: "Devis",
    path: "#",
    icon: "feather-clipboard",
    dropdownMenu: [
      {
        id: 1,
        name: "List Devis",
        path: "/devis/list",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Devis Creer",
        path: "/devis/create",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 4,
    name: "Bon Livraison",
    path: "#",
    icon: "feather-file-text",
    dropdownMenu: [
      {
        id: 1,
        name: "List Bon Livraisons",
        path: "/bon-livraisons/list",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Creer Bon Livr",
        path: "/bon-livraison/create",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 5,
    name: "authentication",
    path: "#",
    icon: "feather-power",

    dropdownMenu: [
      {
        id: 1,
        name: "Users",
        path: "/users",
        subdropdownMenu: false,
      },
      {
        id: 7,
        name: "Create User",
        path: "/users/create",
        subdropdownMenu: false,
      },
      // {
      //   id: 3,
      //   name: "login",
      //   path: "#",
      //   subdropdownMenu: [
      //     {
      //       id: 1,
      //       name: "Cover",
      //       path: "/authentication/login/cover",
      //     },
      //     {
      //       id: 2,
      //       name: "Minimal",
      //       path: "/authentication/login/minimal",
      //     },
      //     {
      //       id: 3,
      //       name: "Creative",
      //       path: "/authentication/login/creative",
      //     },
      //   ],
      // },
    ],
  },
];
