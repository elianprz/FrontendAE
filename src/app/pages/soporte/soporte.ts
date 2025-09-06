import { Component } from '@angular/core';
import { SoporteService } from '../../services/soporte.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-soporte',
  templateUrl: './soporte.html',
  styleUrls: ['./soporte.css']
})
export class Soporte {

  constructor(private soporteService: SoporteService) { }

  enviarMensaje(event: Event) {
    event.preventDefault();
    const target = event.target as any;
    
    const data = {
      PrimerNombre: target['primerNombre'].value,
      PrimerApellido: target['primerApellido'].value,
      Correo: target['correo'].value,
      Asunto: target['asunto'].value,
      Mensaje: target['mensaje'].value
    };

    this.soporteService.enviarMensaje(data).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Mensaje enviado',
          text: response
        });
        // Opcional: limpiar el formulario después de enviar
        target.reset();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al enviar tu mensaje. Inténtalo de nuevo.'
        });
      }
    });
  }
}