import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {

  signUpForm: FormGroup;
  Errormsg: string;

  constructor(private formBuilder: FormBuilder, private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.initForm();
  }
  initForm(){
    this.signUpForm = this.formBuilder.group({
      pseudo: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSignUp(){
    const value = this.signUpForm.value;
    this.authService.SignUpWithEmail(value.pseudo, value.email, value.password).then(
      ()=>{
        this.router.navigate(['/']);
      },
      (error)=>{
        this.Errormsg = error;
      }
    );
  }

  onSignUpWithGoogle(){
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
