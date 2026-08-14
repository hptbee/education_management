import type { Student } from '@/src/types/models'

export function getStudentAvatar(student: Partial<Student>): string {
  if (student.avatar && student.avatar.trim() !== '') {
    return student.avatar;
  }
  
  const idHash = (student.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variant = (idHash % 2) + 1; // 1 or 2
  
  if (student.gender === 'male') {
    return `/avatar-boy-${variant}.png`;
  } else if (student.gender === 'female') {
    return `/avatar-girl-${variant}.png`;
  } else {
    return '/placeholder.svg';
  }
}
