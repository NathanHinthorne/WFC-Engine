/**
 * A backend for the Wave Function Collapse algorithm.
 * It generates a tilemap based on a set of tile rules and a grid size.
 * The tiles rules *could* be handcrafted
 * 
 * Copy and paste this code into your project to generate tilemaps in whatever way you see fit.
 * 
 * @author Nathan Hinthorne
 */


/** The types of tiles that can be used in the output grid */
let tileVariants = [];

/** 2D Array. Contains cells that get collapsed into tiles */
let outputGrid = [];

/** The width of the output grid */
let outputWidth;

/** The height of the output grid */
let outputHeight;

/** Whether the output grid is fully populated */
let outputIsComplete = false;


// Backtracking variables

/** A stack of previous output grid states to allow for backtracking */
let gridStates = [];

/** A stack of cell collapsing decisions made by the program to allow for backtracking */
let decisions = [];

/** The number of times the program has backtracked */
let backtrackAttempts = 0;



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
        let randomFrequency = Math.floor(Math.random() * totalFrequency);

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
        cell.cachedEntropy = obj.cachedEntropy;
        cell.entropyUpdated = obj.entropyUpdated;

        for (let [tileIndex, frequency] of obj.options) {
            cell.options.set(tileIndex, frequency);
        }

        return cell;
    }
}


/**
 * Represents a decision to collapse a cell into a particular tile.
 * 
 * @author Nathan Hinthorne
 */
class Decision {
    constructor(cell, tileIndex) {
        this.cell = cell;
        this.tileIndex = tileIndex;
    }
}


/**
 * Uses the Wave Function Collapse algorithm to generate a tilemap represented as a 2D array of tile indices.
 * 
 * @param {string} tileDataJSON Either a path to a JSON file or a JSON string containing the tile rules. Format should be as follows: 
 * { 
 *   "tileVariants": [
 *     {
 *       "index": 0,
 *       "name": "tile1",
 *       "behavior": "floor",
 *       "up": [ [0,1], [1,1], [2,1] ],
 *       "right": [ [0,1], [1,1], [2,1] ],
 *       "down": [ [0,1], [1,1], [2,1] ],
 *       "left": [ [0,1], [1,1], [2,1] ]
 *     },
 *    ...
 *   ]
 * }
 * 
 * 
 * @param {number} width The desired width of the generated tilemap
 * @param {number} height The desired height of the generated tilemap
 * 
 * @returns {string[][]} A 2D array of tile indices (or tile names if they exist) which represents the generated tilemap
 */
function generateTilemap(tileDataJSON, width, height) {
    // Check if the width and height are positive numbers
    if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
        throw new Error('Invalid width or height');
    }

    outputWidth = width;
    outputHeight = height;


    let json;
    if (typeof tileDataJSON !== 'string') {
        throw new Error('tileDataJSON must be a JSON string or a path to a JSON file');
    } else {
        try {
            // Try to parse the input as JSON
            json = JSON.parse(tileDataJSON);
        } catch (e) {
            // If parsing fails, try to read it as a file
            try {
                tileDataJSON = fs.readFileSync(tileDataJSON, 'utf8');
                json = JSON.parse(tileDataJSON);
            } catch (e) {
                throw new Error('tileDataJSON must be a valid JSON string or a path to a JSON file');
            }
        }
    }



    // Create Tile instances for each tile variant
    tileVariants = json.tileVariants.map(tileData => {
        const tile = new Tile();
        tile.index = tileData.index;
        tile.name = tileData.name;
        tile.behavior = tileData.behavior;
        tile.up = new Map(Object.entries(tileData.up));
        tile.right = new Map(Object.entries(tileData.right));
        tile.down = new Map(Object.entries(tileData.down));
        tile.left = new Map(Object.entries(tileData.left));
        return tile;
    });

    initializeOutputGrid();

    // Collapse cells until the grid is fully populated
    while (!outputIsComplete) {
        populateOutputGrid();
    }

    // Return the output grid as a 2D array of tile indices
    const tilemap = [];

    for (let y = 0; y < outputGrid.length; y++) {
        tilemap[y] = [];
        for (let x = 0; x < outputGrid[y].length; x++) {
            const cell = outputGrid[y][x];
            const tileIndex = cell.selectedTile;
            const tile = tileVariants[tileIndex];

            const displayName = tile.name ? tile.name : tileIndex.toString();

            tilemap[y][x] = displayName;
        }
    }

    return tilemap;
}


/**
 * Clear the output grid and create a new cell for each spot on the grid
 */
function initializeOutputGrid() {
    outputGrid = []; // Clear the output grid

    const floorTiles = tileVariants.filter((tile) => tile.behavior == 'floor');

    // Create cell for each spot on the grid
    for (let y = 0; y < outputHeight; y++) {
        outputGrid[y] = [];
        for (let x = 0; x < outputWidth; x++) {
            // pass in the indices of the tile variants
            const tileIndices = tileVariants.map(tile => tile.index);
            outputGrid[y][x] = new Cell(tileIndices, x, y);

            // Exclude floor tiles from the options of every cell EXCEPT bottom row
            if (y < outputHeight - 1) {
                for (const floorTile of floorTiles) {
                    outputGrid[y][x].exclude(floorTile.index);
                }
            }
        }
    }
}

/**
 * Collapses a cell into a single tile in a way which respects the local constraints.
 */
function populateOutputGrid() {

    // Before collapsing a cell, push the current state of the grid to the stack
    saveGridState();

    /* 
    ========================================================================
    Step 1:  Create a list of cells that have not yet been collapsed.
    ========================================================================
    */
    let uncollapsedCells = outputGrid.flat().filter(cell => !cell.collapsed);

    if (uncollapsedCells.length == 0) {
        outputIsComplete = true;
        return;
    }

    /*
    ========================================================================
    Step 2: Select the cell with the lowest entropy.
    ========================================================================
    */
    uncollapsedCells = uncollapsedCells.sort((a, b) => a.calculateEntropy() - b.calculateEntropy());

    // break ties in entropy by randomness
    let lowestEntropy = uncollapsedCells[0].calculateEntropy();
    let stopIndex = 0;
    for (let i = 1; i < uncollapsedCells.length; i++) {
        if (uncollapsedCells[i].calculateEntropy() > lowestEntropy) {
            stopIndex = i;
            break;
        }
    }
    if (stopIndex > 0) uncollapsedCells.splice(stopIndex); // cut out all cells with higher entropy
    // pick a random cell that's tied for lowest entropy
    const randomIndex = Math.floor(Math.random() * uncollapsedCells.length);
    const cell = uncollapsedCells[randomIndex];


    /*
    ========================================================================
    Step 3: Backtrack if necessary
    ========================================================================
    */
    if (cell.options.size == 0) {
        if (backtrackAttempts < 5) {
            // look one steps back
            backtrack(1);
            backtrackAttempts++;

        } else if (backtrackAttempts >= 5 && backtrackAttempts < 10) {
            // look two steps back
            backtrack(2);
            backtrackAttempts++;

        } else if (backtrackAttempts >= 10 && backtrackAttempts < 20) {
            // look five steps back
            backtrack(5);
            backtrackAttempts++;

        } else { // if we've backtracked 20 times, just start over
            initializeOutputGrid();
        }
        return;
    }
    backtrackAttempts = 0; // reset the backtrack counter


    /*
    ========================================================================
    Step 4: Collapse the selected cell into a single tile.
    ========================================================================
    */
    cell.collapse();
    const tile = tileVariants[cell.selectedTile];

    decisions.push(new Decision(cell, tile.index));


    /*
    ========================================================================
    Step 5: Update the options fields of the neighboring cells based on the 
            adjacency rules and frequency hints of the collapsed cell's tile.
    ========================================================================
    */
    if (cell.y > 0) { // there's a tile above us
        const upNeighbor = outputGrid[cell.y - 1][cell.x];

        if (!upNeighbor.collapsed) {
            // Remove tile options in neighbor that are not present in this tile's 'up' options.
            // In other words, perform an INTERSECTION between neighbor's options and this tile's 'up' options

            upNeighbor.options.forEach((optionFrequency, optionTile) => {
                if (!tile.up.has(optionTile)) {
                    upNeighbor.options.delete(optionTile);
                } else {
                    // Combine the frequencies of the tile options
                    const currentTileFrequency = tile.up.get(optionTile);
                    upNeighbor.options.set(optionTile, optionFrequency + currentTileFrequency);
                }
            });
        }
    }

    if (cell.x < outputWidth - 1) { // there's a tile to our right
        const rightNeighbor = outputGrid[cell.y][cell.x + 1];

        if (!rightNeighbor.collapsed) {
            // Remove tile options in neighbor that are not present in this tile's 'right' options.
            // In other words, perform an INTERSECTION between neighbor's options and this tile's 'right' options

            rightNeighbor.options.forEach((optionFrequency, optionTile) => {
                if (!tile.right.has(optionTile)) {
                    rightNeighbor.options.delete(optionTile);
                } else {
                    // Combine the frequencies of the tile options
                    const currentTileFrequency = tile.right.get(optionTile);
                    rightNeighbor.options.set(optionTile, optionFrequency + currentTileFrequency);
                }
            });
        }
    }

    if (cell.y < outputHeight - 1) { // there's a tile below us
        const downNeighbor = outputGrid[cell.y + 1][cell.x];

        if (!downNeighbor.collapsed) {
            // Remove tile options in neighbor that are not present in this tile's 'down' options.
            // In other words, perform an INTERSECTION between neighbor's options and this tile's 'down' options

            downNeighbor.options.forEach((optionFrequency, optionTile) => {
                if (!tile.down.has(optionTile)) {
                    downNeighbor.options.delete(optionTile);
                } else {
                    // Combine the frequencies of the tile options
                    const currentTileFrequency = tile.down.get(optionTile);
                    downNeighbor.options.set(optionTile, optionFrequency + currentTileFrequency);
                }
            });
        }
    }

    if (cell.x > 0) { // there's a tile to our left
        const leftNeighbor = outputGrid[cell.y][cell.x - 1];

        if (!leftNeighbor.collapsed) {
            // Remove tile options in neighbor that are not present in this tile's 'left' options.
            // In other words, perform an INTERSECTION between neighbor's options and this tile's 'left' options

            leftNeighbor.options.forEach((optionFrequency, optionTile) => {
                if (!tile.left.has(optionTile)) {
                    leftNeighbor.options.delete(optionTile);
                } else {
                    // Combine the frequencies of the tile options
                    const currentTileFrequency = tile.left.get(optionTile);
                    leftNeighbor.options.set(optionTile, optionFrequency + currentTileFrequency);
                }
            });
        }
    }
}

// When we backtrack, we restore the state and exclude the previous decision
function backtrack(steps) {
    const poppedDecisions = [];

    for (let i = 0; i < steps; i++) {
        const decision = decisions.pop();
        poppedDecisions.push(decision);

        gridStates.pop();
    }

    // restore the grid state
    const prevGridState = gridStates[gridStates.length - 1];
    outputGrid = prevGridState.map(row => row.map(cellObj => {
        const cell = Cell.fromObject(cellObj);
        cell.options = new Map(cell.options);
        return cell;
    }));

    // exclude the tile options in the restored grid state
    for (const decision of poppedDecisions) {
        if (decision) {
            console.log(decision);
            const cell = outputGrid[decision.cell.y][decision.cell.x];
            if (!cell.collapsed) {
                cell.exclude(decision.tileIndex);
            } else {
                initializeOutputGrid();
                break;
            }
        }
    }
}

/**
 * Save a deep copy of the current grid state to the stack
 */
function saveGridState() {
    gridStates.push(outputGrid.map(row => row.map(cell => {
        let cellCopy = Object.assign({}, cell);
        cellCopy.options = Array.from(cell.options);
        return cellCopy;
    })));
}



const fs = require('fs');

const tilemap = generateTilemap('./test-file.json', 10, 10);
console.log(tilemap);