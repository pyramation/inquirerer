export interface Value {
  name: string;
  value: boolean;
}

export interface BaseQuestion {
    name: string;
    type: string;
    default?: any;
    required?: boolean;
    message?: string;
  }
  
  export interface ConfirmQuestion extends BaseQuestion {
    type: 'confirm';
    default?: boolean;  // Defaults are typically boolean for confirm types
  }
  
  export interface AutocompleteQuestion extends BaseQuestion {
    type: 'autocomplete';
    options: string[];
    maxDisplayLines?: number;
    returnFullResults?: boolean;
    allowCustomOptions?: boolean;
  }
  
  export interface CheckboxQuestion extends BaseQuestion {
    type: 'checkbox';
    options: string[];
    maxDisplayLines?: number;
    returnFullResults?: boolean;
    default?: Value[];
  }
  
  export interface TextQuestion extends BaseQuestion {
    type: 'text';
    default?: string;
  }
  
  export type Question = ConfirmQuestion | AutocompleteQuestion | CheckboxQuestion | TextQuestion;