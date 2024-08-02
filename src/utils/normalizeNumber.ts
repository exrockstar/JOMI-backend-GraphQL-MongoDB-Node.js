/** Checks if is a number, if not returns 0
 *
 * @param {any} item
 * @returns {number}
 */

 export const normalizeNumber = (item: any): number => {
    if (isNaN(+item)) {
      return 0;
    }
  
    return +item;
};
  