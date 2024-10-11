import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fontSize',
  standalone: true
})
export class FontSizePipe implements PipeTransform {

  transform(value: number, ...args: unknown[]): string {
    return `${value / 16}rem`;
  }

}
