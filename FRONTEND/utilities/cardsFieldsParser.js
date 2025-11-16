export function getShortSetName(setName) {
  const match = setName.match(/\[(.*?)\]/)
  return match ? match[1] : 'No set'
}
