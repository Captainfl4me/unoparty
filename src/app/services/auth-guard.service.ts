import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate{

  constructor(private authService: AuthService, private router: Router) { }

  canActivate(): Promise<boolean>{
    return new Promise<boolean>(
      (resolve, reject)=>{
          if(this.authService.isLoaded){
            if(this.authService.isAuth){
              resolve(true);
            }else{
              resolve(false);
              this.router.navigate(['/auth']);
            }
          }else{
            const unsubcribe = this.authService.isLoadedSubject.subscribe(
              (isLoad)=>{
                if(isLoad){
                  if(this.authService.isAuth){
                    resolve(true);
                  }else{
                    resolve(false);
                    this.router.navigate(['/auth']);
                  }
                  unsubcribe.unsubscribe();
                }
              }
            );
          }
    });
  }
}
