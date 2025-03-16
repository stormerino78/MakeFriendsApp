export const getEventColor = (eventType?: string) => {
    switch (eventType) {
      case 'sport':
        return 'green';
      case 'cultural':
        return 'purple';
      case 'activity':
        return 'orange';
      case 'online':
        return 'blue';
      default:
        return 'red';
    }
  };
  
export const getPersonColor = (personMood?: string) => {
switch (personMood) {
    case 'quick chat':
    return 'yellow';
    case 'deep talk':
    return 'brown';
    case 'professional':
    return 'gray';
    default:
    return 'black';
}
};
