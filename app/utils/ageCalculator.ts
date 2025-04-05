/**
 * Calculate age from date of birth string
 * @param dateOfBirth Date string in DD-MM-YY format
 * @returns Calculated age
 */
export function calculateAge(dateOfBirth: string): number {
    const [day, month, year] = dateOfBirth.split('-');
    const fullYear = Number.parseInt(year) < 50 ? `20${year}` : `19${year}`;
    const formattedDate = `${fullYear}-${month}-${day}`;
    
    const birthDate = new Date(formattedDate);
    const today = new Date();
    
    // Calculate age
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Subtract 1 if birthday hasn't passed yet
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
} 