import { NgModule, Component } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SigninComponent } from './auth/signin/signin.component';
import { SignupComponent } from './auth/signup/signup.component';
import { AuthGuardService } from './services/auth-guard.service';
import { GameComponent } from './game/game.component';
import { ConnectGuardService } from './services/connect-guard.service';
import { MenuComponent } from './menu/menu.component';


const routes: Routes = [
  {path: 'auth/signin', canActivate: [ConnectGuardService], component: SigninComponent},
  {path: 'auth/signup', canActivate: [ConnectGuardService], component: SignupComponent},
  {path: 'auth', redirectTo: '/auth/signin'},
  {path: 'menu', canActivate: [AuthGuardService], component: MenuComponent},
  {path: 'game/:conf/:id', canActivate: [AuthGuardService], component: GameComponent},
  {path: '', redirectTo: '/menu', pathMatch: 'full'},
  {path: '**', redirectTo: '/menu'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
