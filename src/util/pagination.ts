export default class Pagination {
  /**
   * Calculates the offset value for pagination based on the current page number and page size.
   * @param {number} page - The current page number.
   * @param {number} pageSize - The number of items per page.
   * @returns {number} - The offset value to be used in a database query or similar operation.
   */
  static calculateOffset = (page: number, pageSize: number): number => (page - 1) * pageSize;

  /**
   * Calculates the total number of pages based on the total count of items and the page size.
   * @param {number} totalCount - The total count of items.
   * @param {number} pageSize - The number of items per page.
   * @returns {number} - The total number of pages needed to display all items.
   */
  static calculateTotalPages = (totalCount: number, pageSize: number): number => Math.ceil(totalCount / pageSize);
}
