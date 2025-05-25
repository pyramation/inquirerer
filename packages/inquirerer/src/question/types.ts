export interface Value {
  name: string;
  value: boolean;
}
export interface OptionValue {
  name: string;
  value: any;
  selected?: boolean;
}

export interface Validation {
  type?: string;
  success: boolean;
  reason?: string;
}

export interface BaseQuestion {
    name: string;
    type: string;
    default?: any;
    useDefault?: boolean;
    required?: boolean;
    message?: string;
    description?: string;
    validate?: (input: any, obj: any) => Validation | boolean;
    sanitize?: (input: any, obj: any) => any;
    pattern?: string;
    dependsOn?: string[];
    when?: (answers: any) => boolean;
  }
  
  export interface ConfirmQuestion extends BaseQuestion {
    type: 'confirm';
    default?: boolean;  // Defaults are typically boolean for confirm types
  }
  
  export interface AutocompleteQuestion extends BaseQuestion {
    type: 'autocomplete';
    options: (string|OptionValue)[];
    maxDisplayLines?: number;
    allowCustomOptions?: boolean;
  }

  export interface ListQuestion extends BaseQuestion {
    type: 'list';
    options: (string|OptionValue)[];
    maxDisplayLines?: number;
    allowCustomOptions?: boolean;
  }
  
  export interface CheckboxQuestion extends BaseQuestion {
    type: 'checkbox';
    options: (string|OptionValue)[];
    maxDisplayLines?: number;
    returnFullResults?: boolean;
    allowCustomOptions?: boolean;
    default?: string[];
  }
  
  export interface TextQuestion extends BaseQuestion {
    type: 'text';
    default?: string;
  }

  export interface NumberQuestion extends BaseQuestion {
    type: 'number';
    default?: number;
  }
  
  export type Question = ConfirmQuestion | ListQuestion | AutocompleteQuestion | CheckboxQuestion | TextQuestion | NumberQuestion;