import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
@Component({
  // selector: 'app-employee-layout',
  // imports: [],
  // templateUrl: './employee-layout.html',
  // styleUrl: './employee-layout.css'
  selector: 'app-employee-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <main>
      <router-outlet></router-outlet> </main>
  `,
  styleUrl: './employee-layout.css'
})
export class EmployeeLayout {

}
