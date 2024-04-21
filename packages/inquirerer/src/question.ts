export interface Question {
  name: string;
  type?: string; // This can be used for further customizations like validating input based on type

  options?: string[],

  maxDisplayLines?: number;  // Optional parameter to limit the number of visible options

  returnFullResults?: boolean;
  allowCustomOptions?: boolean;

  required?: boolean;
}
