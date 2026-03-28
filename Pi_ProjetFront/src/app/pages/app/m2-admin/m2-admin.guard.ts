import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";
import { AuthService } from "../../../auth/auth.service";

export const m2AdminGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const snackBar = inject(MatSnackBar);
    const role = auth.currentUser()?.role;
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
        return true;
    }
    snackBar.open("You don't have permission to access the admin panel.", "Close", { duration: 4000 });
    return router.createUrlTree(["/app/dashboard"]);
};
