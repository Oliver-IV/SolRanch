import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PublicKey } from '@solana/web3.js';

@ValidatorConstraint({ async: false })
export class IsSolanaAddressConstraint implements ValidatorConstraintInterface {
  validate(pubkey: any) {
    if (typeof pubkey !== 'string') return false;
    try {
      new PublicKey(pubkey); 
      return true;
    } catch (e) {
      return false;
    }
  }

  defaultMessage() {
    return 'Invalid Solana public key address';
  }
}

export function IsSolanaAddress(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSolanaAddressConstraint,
    });
  };
}