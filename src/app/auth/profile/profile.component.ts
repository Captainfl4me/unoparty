import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  ParamsForm: FormGroup;

  constructor(private formBuilder: FormBuilder, private authService: AuthService) { }
  
  ngOnInit(){
    this.initForm();
    this.updateFrom();
  }

  initForm(){
    this.ParamsForm = this.formBuilder.group({
      displayName: ['', Validators.required],
      themeSlt: ['']
    });    
  }

  updateFrom(){
    this.checkUserPref().then(()=>{
      this.ParamsForm.setValue({
        displayName: this.authService.username,
        themeSlt: this.authService.userPreferences.theme
      })
    });
  }

  checkUserPref(){
    return new Promise((resolve)=>{
      if(this.authService.userPreferences != undefined && this.authService.username != undefined){
        resolve(true);
      }else{
        this.authService.getUserPreferences().then(()=>{ resolve(true); });
      }
    });
  }

  //form submit
  onChangeDisplayName(){
    const value = this.ParamsForm.value;
    this.authService.setUsername(value.displayName).then(()=>{ 
      this.authService.setUserPreferences(this.authService.userPreferences.cards, value.themeSlt).then(()=>{
        window.location.reload();
      });
     });
  }

}
