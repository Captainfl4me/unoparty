import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.css']
})
export class SigninComponent implements OnInit {

  signInForm: FormGroup;
  Errormsg: string;

  constructor(private authService: AuthService, private formBuilder: FormBuilder, private router: Router) { }

  ngOnInit(): void {
    this.initForm();
  }

  initForm(){
    this.signInForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSignIn(){
    const value = this.signInForm.value;
    this.authService.SignInWithEmail(value.email, value.password).then(
      ()=>{
        this.router.navigate(['/']);
      },
      (error)=>{
        this.Errormsg = error;
      }
    );
  }

  onSignInWithGoogle(){
    this.authService.SignInWithGoogle().then(
      ()=>{
        this.router.navigate(['/']);
      },
      (error)=>{
        this.Errormsg = error;
      }
    );
  }
}
