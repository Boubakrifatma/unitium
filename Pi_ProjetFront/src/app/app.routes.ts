import { Routes } from "@angular/router";
import { AuthLayoutComponent } from "./layouts/auth-layout/auth-layout.component";
import { AppLayoutComponent } from "./layouts/app-layout/app-layout.component";
import { FullLayoutComponent } from "./layouts/full-layout/full-layout.component";
import { WebsiteLayoutComponent } from "./layouts/website-layout/websitelayout.component";
import { authGuard } from "./auth/auth.guard";

export const routes: Routes = [
    {
        path: "",
        redirectTo: "/web/website",
        pathMatch: "full",
    },
    {
        path: "auth",
        component: AuthLayoutComponent,
        children: [
            {
                path: "",
                redirectTo: "landing",
                pathMatch: "full",
            },
            {
                path: "landing",
                loadComponent: () => import("./pages/auth/landing/landing.component").then((c) => c.LandingComponent),
            },
            {
                path: "login",
                loadComponent: () => import("./pages/auth/login/login.component").then((c) => c.LoginComponent),
            },
            {
                path: "signup",
                loadComponent: () => import("./pages/auth/signup/signup.component").then((c) => c.SignupComponent),
            },
            {
                path: "forgot-password",
                loadComponent: () => import("./pages/auth/forgot-password/forgot-password.component").then((c) => c.ForgotPasswordComponent),
            },
            {
                path: "change-password",
                loadComponent: () => import("./pages/auth/change-password/change-password.component").then((c) => c.ChangePasswordComponent),
            },
            {
                path: "first-login",
                loadComponent: () => import("./pages/auth/first-login/first-login.component").then((c) => c.FirstLoginComponent),
            },
            {
                path: "signup-success",
                loadComponent: () => import("./pages/auth/signup-success/signup-success.component").then((c) => c.SignupSuccessComponent),
            },
        ],
    },
    {
        path: "app",
        component: AppLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: "",
                redirectTo: "dashboard",
                pathMatch: "full",
            },
            {
                path: "dashboard",
                loadComponent: () => import("./pages/app/dashboard/dashboard.component").then((c) => c.DashboardComponent),
            },
            {
                path: "projects",
                loadComponent: () => import("./pages/app/projects/projects.component").then((c) => c.ProjectsComponent),
            },
            {
                path: "project-details",
                loadComponent: () => import("./pages/app/projects/project-details.component").then((c) => c.ProjectDetailsComponent),
            },
            {
                path: "employee",
                loadComponent: () => import("./pages/app/employee/employee.component").then((c) => c.EmployeeComponent),
            },
            {
                path: "time-tracking",
                loadComponent: () => import("./pages/app/task-manage/time-tracking.component").then((c) => c.TimeTrackingComponent),
            },
            {
                path: "task-details",
                loadComponent: () => import("./pages/app/task-manage/task-details.component").then((c) => c.TaskDetailsComponent),
            },
            {
                path: "kanban",
                loadComponent: () => import("./pages/app/task-manage/kanban.component").then((c) => c.KanbanComponent),
            },
            {
                path: "gantt-chart",
                loadComponent: () => import("./pages/app/task-manage/gantt-chart.component").then((c) => c.GanttChartComponent),
            },
            {
                path: "all-tasks",
                loadComponent: () => import("./pages/app/task-manage/all-task.component").then((c) => c.AllTaskComponent),
            },
            {
                path: "orders",
                loadComponent: () => import("./pages/app/ecommerce/orders.component").then((c) => c.OrdersComponent),
            },
            {
                path: "customers",
                loadComponent: () => import("./pages/app/customers/customers.component").then((c) => c.CustomersComponent),
            },
            {
                path: "ecommerce",
                loadComponent: () => import("./pages/app/ecommerce/ecommerce.component").then((c) => c.EcommerceComponent),
            },
            {
                path: "add-product",
                loadComponent: () => import("./pages/app/ecommerce/add-product.component").then((c) => c.AddProductComponent),
            },
            {
                path: "cart",
                loadComponent: () => import("./pages/app/ecommerce/cart.component").then((c) => c.CartComponent),
            },
            {
                path: "checkout",
                loadComponent: () => import("./pages/app/ecommerce/checkout.component").then((c) => c.CheckoutComponent),
            },
            {
                path: "invoice",
                loadComponent: () => import("./pages/app/ecommerce/invoice.component").then((c) => c.InvoiceComponent),
            },
            {
                path: "products",
                loadComponent: () => import("./pages/app/ecommerce/products.component").then((c) => c.ProductsComponent),
            },
            {
                path: "product",
                loadComponent: () => import("./pages/app/ecommerce/product.component").then((c) => c.ProductComponent),
            },
            {
                path: "calendar",
                loadComponent: () => import("./pages/app/applications/calendar/calendar.component").then((c) => c.CalendarComponent),
            },
            {
                path: "explorer",
                loadComponent: () => import("./pages/app/applications/explorer/explorer.component").then((c) => c.ExplorerComponent),
            },
            {
                path: "chat",
                loadComponent: () => import("./pages/app/applications/chat/chat.component").then((c) => c.ChatComponent),
            },
            {
                path: "profile",
                loadComponent: () => import("./pages/app/profile/profile.component").then((c) => c.ProfileComponent),
            },
            {
                path: "plans",
                loadComponent: () => import("./pages/app/profile/plans.component").then((c) => c.PlansComponent),
            },
            {
                path: "subscription",
                loadComponent: () => import("./pages/app/profile/subscription.component").then((c) => c.SubscriptionComponent),
            },
            {
                path: "settings",
                loadComponent: () => import("./pages/app/profile/settings.component").then((c) => c.SettingsComponent),
            },
            {
                path: "pages",
                loadComponent: () => import("./pages/app/pages.component").then((c) => c.PagesComponent),
            },
            {
                path: "users",
                loadComponent: () => import("./users/users.component").then((c) => c.UsersComponent),
            },
            {
                path: "super-admin",
                loadComponent: () => import("./pages/app/super-admin/super-admin.component").then((c) => c.SuperAdminComponent),
            },
            {
                path: "super-admin-billing",
                loadComponent: () => import("./pages/app/super-admin/super-admin-billing.component").then((c) => c.SuperAdminBillingComponent),
            },
            {
                path: "org-billing",
                loadComponent: () => import("./pages/app/org-billing/org-billing.component").then((c) => c.OrgBillingComponent),
            },
            {
                path: "upgrade-confirmation",
                loadComponent: () => import("./billing/pages/confirmation/payment-confirmation.component").then((c) => c.PaymentConfirmationComponent),
            },
            {
                path: "po",
                loadComponent: () => import("./pages/app/po/po-dashboard.component").then((c) => c.PoDashboardComponent),
            },
        ],
    },
    {
        path: "web",
        component: WebsiteLayoutComponent,
        children: [
            {
                path: "website",
                loadComponent: () => import("./pages/website/website.component").then((c) => c.WebsiteComponent),
            },
            {
                path: "blog",
                loadComponent: () => import("./pages/website/blog.component").then((c) => c.BlogComponent),
            },
            {
                path: "blog-details",
                loadComponent: () => import("./pages/website/blogdetails.component").then((c) => c.BlogDetailsComponent),
            },
            {
                path: "case-study",
                loadComponent: () => import("./pages/website/casestudy.component").then((c) => c.CaseStudyComponent),
            },
            {
                path: "contact-us",
                loadComponent: () => import("./pages/website/contactus.component").then((c) => c.ContactUsComponent),
            },
            {
                path: "about-us",
                loadComponent: () => import("./pages/website/aboutus.component").then((c) => c.AboutUsComponent),
            },
        ],
    },
    // ─── Billing & Subscription Flow ──────────────────────────────────────────
    {
        path: "billing",
        component: WebsiteLayoutComponent,
        children: [
            {
                path: "",
                redirectTo: "pricing",
                pathMatch: "full",
            },
            {
                path: "pricing",
                loadComponent: () => import("./billing/pages/pricing/pricing.component").then((c) => c.PricingComponent),
            },
            {
                path: "checkout",
                loadComponent: () => import("./billing/pages/checkout/checkout.component").then((c) => c.CheckoutComponent),
            },
            {
                path: "payment",
                loadComponent: () => import("./billing/pages/payment/payment.component").then((c) => c.PaymentComponent),
            },
            {
                path: "confirmation",
                loadComponent: () => import("./billing/pages/confirmation/payment-confirmation.component").then((c) => c.PaymentConfirmationComponent),
            },
        ],
    },
    {
        path: "",
        component: FullLayoutComponent,
        children: [
            {
                path: "coming-soon",
                loadComponent: () => import("./pages/full/coming-soon/coming-soon.component").then((c) => c.ComingSoonComponent),
            },
            {
                path: "**",
                loadComponent: () => import("./pages/full/page-not-found/page-not-found.component").then((c) => c.PageNotFoundComponent),
            },
        ],
    },
];
