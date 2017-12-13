import { ComponentsModule } from './../../components/components.module';
import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';

//Pages
import { ContaPage } from './conta';


@NgModule({
  declarations: [
    ContaPage
  ],
  imports: [
    IonicPageModule.forChild(ContaPage),
    ComponentsModule
  ],
})
export class ContaPageModule { }
