/**
 * Tiles refer to the individual images that make up the grid. 
 * They contain information about their possible neighboring tiles.
 * 
 * @author Nathan Hinthorne
 */
class Tile {
  constructor() {

    /** The index of the tile in the tileset */
    this.index = null;

    /** The name of the tile (will appear in place of index in the tilemap) */
    this.name = null; // Optional field

    /** Optional field. Tile is treated in a special way depending on the behavior. */
    this.behavior = null;


    // Maps of tile indices to their frequency,
    // This rolls adjacency rules and frequency hints into one

    /** A Map where the keys are the indices of available tiles to appear above this one, and the values are their corresponding frequencies */
    this.up = new Map();

    /** A Map where the keys are the indices of available tiles to appear to the right of this one, and the values are their corresponding frequencies */
    this.right = new Map();

    /** A Map where the keys are the indices of available tiles to appear below this one, and the values are their corresponding frequencies */
    this.down = new Map();

    /** A Map where the keys are the indices of available tiles to appear to the left of this one, and the values are their corresponding frequencies */
    this.left = new Map();
  }
}
