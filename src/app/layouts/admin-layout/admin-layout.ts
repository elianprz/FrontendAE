import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  // selector: 'app-admin-layout',
  // imports: [],
  // templateUrl: './admin-layout.html',
  // styleUrl: './admin-layout.css'
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `

      <router-outlet></router-outlet>
  `,
  styleUrl: './admin-layout.css'
})
export class AdminLayout {

}
