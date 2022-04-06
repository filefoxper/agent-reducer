import { validate } from './util';

let exp = process.env.AGENT_REDUCER_EXPERIENCE === 'OPEN';

export function experience():void {
  exp = true;
}

export function isExperience():boolean {
  return exp;
}

export function validateExperience():void {
  validate(exp, 'This function is in experience, you have to use API `experience` to active it first');
}
