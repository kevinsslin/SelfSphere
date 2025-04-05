import type { RESTRICTIONS } from './constants';

export interface DisclosedAttributes {
    issuing_state?: boolean;
    name?: boolean;
    nationality?: boolean;
    date_of_birth?: boolean;
    passport_number?: boolean;
    gender?: boolean;
    expiry_date?: boolean;
}

export interface CommentRestrictions {
    enabled: {
        [key in keyof typeof RESTRICTIONS]: boolean;
    };
    minimumAge?: number;
    gender?: string;
    nationality?: {
        mode: string;
        countries: string[];
    };
}

export interface PostData {
    post_id: string;
    user_id: string;
    title: string;
    content: string;
    status: 'pending' | 'posted' | 'rejected';
    created_at: string;
    updated_at: string;
    disclosed_attributes: Record<string, boolean>;
    commentRestrictions: {
        enabled: {
            [RESTRICTIONS.AGE]: boolean;
            [RESTRICTIONS.GENDER]: boolean;
            [RESTRICTIONS.NATIONALITY]: boolean;
        };
        minimumAge: number;
        gender: string;
        nationality: {
            countries: string[];
        };
    };
    token_name: string;
    token_symbol: string;
}

export interface CommentData {
    post_id: string;
    content: string;
    user_id: string;
    status: 'pending' | 'posted' | 'failed';
}

export interface VerificationResult {
    isValid: boolean;
    isValidDetails?: Record<string, boolean>;
    credentialSubject?: {
        issuing_state?: string;
        name?: string;
        nationality?: string;
        date_of_birth?: string;
        passport_number?: string;
        gender?: string;
        expiry_date?: string;
    };
} 