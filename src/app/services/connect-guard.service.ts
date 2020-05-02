import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ConnectGuardService implements CanActivate{

  constructor(private authService: AuthService, private router: Router) { }

  canActivate(){
    return new Promise<boolean>(
      (resolve, reject)=>{
          if(this.authService.isLoaded){
            if(this.authService.isAuth){
              resolve(false);
              this.router.navigate(['/']);
            }else{
              resolve(true);
            }
          }else{
            const unsubcribe = this.authService.isLoadedSubject.subscribe(
              (isLoad)=>{
                if(isLoad){
                  if(this.authService.isAuth){
                    resolve(false);
                    this.router.navigate(['/']);
                  }else{
                    resolve(true);
                  }
                  unsubcribe.unsubscribe();
                }
              }
            );
          }
    });
  }
}
