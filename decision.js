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