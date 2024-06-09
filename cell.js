/**
 * Cells are placed in the output grid and contain the possible tiles that can be placed in that cell.
 * 
 * @author Nathan Hinthorne
 */
class Cell {

  /**
   * @param {number[]} tileIndices - The indices of the tiles that can be placed in this cell
   * @param {number} x - The x position of the cell in the output grid
   * @param {number} y - The y position of the cell in the output grid
   */
  constructor(tileIndices, x, y) {
    /** The maximum entropy this cell could have over the course of the algorithm */
    this.maxEntropy = tileIndices.length;

    /** This cell's x position in the output grid */
    this.x = x;

    /** This cell's y position in the output grid */
    this.y = y;

    /** Whether or not the cell has collapsed into a tile */
    this.collapsed = false;

    /** The tile index that this cell has collapsed into */
    this.selectedTile = null;

    /** A Map where the keys are the indices of available tiles to choose from, and the values are their corresponding frequencies */
    this.options = new Map();

    // This rolls adjacency rules and frequency hints into one
    // Key: Tile Index, Value: Number of times this tile was found connected to given tile index
    // start off with every tile as an option
    for (let tileIndex of tileIndices) {
      this.options.set(tileIndex, 0);
    }

    this.cachedEntropy = null;
    this.entropyUpdated = false;
  }

  /**
   * Calculates the entropy of the cell based on the tile options available.
   * 
   * @returns {number} The entropy of the cell
   */
  calculateEntropy() {
    if (this.collapsed) {
      return 0;
    }

    // if (!this.entropyUpdated) {
    //   return this.cachedEntropy;
    // }

    // Approach #1: Rough estimate of entropy (not weighted by frequency)
    let entropy = this.options.size;

    // Approach #2: Shannon entropy
    // let totalFrequencies = 0;
    // for (const [_, freq] of this.options) {
    //   totalFrequencies += freq
    // }

    // let entropy = 0;
    // for (const [_, freq] of this.options) {
    //   const probability = freq / totalFrequencies; // 1% to 100%

    //   // Formula for Shannon entropy
    //   entropy -= probability * Math.log2(probability);
    // }

    this.cachedEntropy = entropy;
    this.entropyUpdated = false;
    return entropy;
  }

  /**
   * Collapse the cell by picking from the tile options, weighted by their frequency
   */
  collapse() {
    if (this.collapsed) {
      throw new Error('Cell has already been collapsed');
    }

    if (this.options.size === 0) {
      throw new Error('Tried to collapse, but no tile options were available')
    }
    // Calculate cumulative frequencies
    let frequencyDistribution = new Map();
    let totalFrequency = 0;
    for (let [tileIndex, frequency] of this.options) {
      totalFrequency += frequency;
      frequencyDistribution.set(tileIndex, totalFrequency);
    }

    // Select a random point in the total frequency range
    let randomFrequency = Math.floor(random(0, totalFrequency));

    // Find the first item which has a cumulative frequency greater than or equal to the random frequency
    let pick = null;
    for (let [tileIndex, cumulativeFrequency] of frequencyDistribution) {
      if (cumulativeFrequency >= randomFrequency) {
        pick = tileIndex;
        break;
      }
    }

    this.selectedTile = pick;

    this.options.clear(); // erase all other options

    this.collapsed = true;
  }

  /**
   * @param {number} tileIndex - The index of the tile to exclude from the cell's options
   */
  exclude(tileIndex) {
    if (this.collapsed) {
      throw new Error('Cell has already been collapsed');
    }

    this.options.delete(tileIndex);
  }

  /**  
   * Recreates a cell from a JSON object.
   * Used for backtracking.
   * 
   * @param {Object} obj - The object to recreate the cell from
   * @returns {Cell} - The cell recreated from the object
   */
  static fromObject(obj) {
    let cell = new Cell([], obj.x, obj.y);
    cell.maxEntropy = obj.maxEntropy;
    cell.collapsed = obj.collapsed;
    cell.selectedTile = obj.selectedTile;
    cell.totalFrequencyInGrid = obj.totalFrequencyInGrid;

    for (let [tileIndex, frequency] of obj.options) {
      cell.options.set(tileIndex, frequency);
    }

    return cell;
  }
}
