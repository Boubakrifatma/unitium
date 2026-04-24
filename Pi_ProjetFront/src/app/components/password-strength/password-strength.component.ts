import { Component, ElementRef, ViewChild, AfterViewInit } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIcon } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";

@Component({
    selector: "app-password-strength",
    standalone: true,
    imports: [MatIcon, MatInputModule, MatFormFieldModule, MatButtonModule],
    template: `
        <mat-form-field appearance="outline" class="w-100">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" #passwordInput [type]="hidePassword ? 'password' : 'text'" placeholder="Create a strong password" />
            <button matIconButton matSuffix (click)="hidePassword = !hidePassword" type="button">
                <mat-icon class="material-icons-outlined">{{ hidePassword ? "visibility_off" : "visibility" }}</mat-icon>
            </button>
        </mat-form-field>

        <div class="row gx-3 mb-3">
            <div class="col">
                <div id #fieldPassWrap class="check-strength">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            </div>
            <div class="col-auto">
                <p #passwordText>
                    {{ strengthMessage }}
                </p>
            </div>
        </div>
    `,
    styles: [``],
})
export class PasswordStrengthComponent implements AfterViewInit {
    hidePassword = true;
    @ViewChild("passwordInput") passwordInput?: ElementRef; // make optional
    @ViewChild("passwordText") passwordText?: ElementRef; // make optional
    @ViewChild("fieldPassWrap") fieldPassWrap?: ElementRef; // make optional
    strengthMessage: string = "";

    constructor() {}

    ngAfterViewInit() {
        if (this.passwordInput && this.passwordInput.nativeElement) {
            // null check
            this.passwordInput.nativeElement.addEventListener("keyup", () => {
                if (this.fieldPassWrap && this.fieldPassWrap.nativeElement) {
                    // null check
                    this.strengthMessage = this.checkStrength(this.passwordInput!.nativeElement.value, this.fieldPassWrap!.nativeElement); //use ! to tell typescript it will not be null.

                    if (this.fieldPassWrap!.nativeElement) {
                        //null check
                        if (this.passwordInput!.nativeElement.value) {
                            this.fieldPassWrap!.nativeElement.classList.remove("show");
                        } else {
                            this.fieldPassWrap!.nativeElement.classList.add("show");
                            this.strengthMessage = "";
                        }
                    }
                }
            });
        }
    }

    checkStrength(password: string, fieldPassWrap: HTMLElement): string {
        let strength = 0;
        const checksterngthdisplay = this.fieldPassWrap!.nativeElement;
        const textpassword = this.passwordText?.nativeElement; //null check

        if (password.length < 6 || password.length < 1) {
            if (this.fieldPassWrap!.nativeElement) {
                this.fieldPassWrap!.nativeElement.className = "";
                this.fieldPassWrap!.nativeElement.classList.add("check-strength", "short");
            }
            if (textpassword) {
                //null check
                textpassword.className = "";
                textpassword.classList.add("text-secondary", "small");
            }
            return "Too short";
        }

        if (password.length > 7) strength += 1;
        if (password.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/)) strength += 1;
        if (password.match(/([a-zA-Z])/) && password.match(/([0-9])/)) strength += 1;
        if (password.match(/([!,%,&,@,#,$,^,*,?,_,~])/)) strength += 1;
        if (password.match(/(.*[!,%,&,@,#,$,^,*,?,_,~].*[!,%,&,@,#,$,^,*,?,_,~])/)) strength += 1;

        if (strength < 2) {
            if (this.fieldPassWrap!.nativeElement) {
                this.fieldPassWrap!.nativeElement.className = "";
                this.fieldPassWrap!.nativeElement.classList.add("check-strength", "weak");
            }
            if (textpassword) {
                //null check
                textpassword.className = "";
                textpassword.classList.add("text-red", "small");
            }
            fieldPassWrap.classList.remove("is-valid");
            return "This is a weak";
        } else if (strength === 2) {
            if (this.fieldPassWrap!.nativeElement) {
                this.fieldPassWrap!.nativeElement.className = "";
                this.fieldPassWrap!.nativeElement.classList.add("check-strength", "good");
            }
            if (textpassword) {
                //null check
                textpassword.className = "";
                textpassword.classList.add("text-orange", "small");
            }
            fieldPassWrap.classList.remove("is-valid");
            return "This is a good";
        } else {
            if (this.fieldPassWrap!.nativeElement) {
                this.fieldPassWrap!.nativeElement.className = "";
                this.fieldPassWrap!.nativeElement.classList.add("check-strength", "strong");
            }
            if (textpassword) {
                //null check
                textpassword.className = "";
                textpassword.classList.add("text-green", "small");
            }
            fieldPassWrap.classList.add("is-valid");
            return "Wow! It's a strong";
        }
    }
}
