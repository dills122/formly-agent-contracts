import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { FeatureLibModule } from '@nx-fixture/feature-lib';
import { FormlyModule } from '@ngx-formly/core';

import { AppComponent } from './app.component.js';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    FormlyModule.forRoot(),
    FeatureLibModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
