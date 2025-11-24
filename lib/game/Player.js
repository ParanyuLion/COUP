class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.coins = 2;
    this.hand = []; // Array of card names
    this.isAlive = true;
  }

  addCard(card) {
    this.hand.push(card);
  }

  removeCard(cardIndex) {
    if (cardIndex >= 0 && cardIndex < this.hand.length) {
      const removed = this.hand.splice(cardIndex, 1)[0];
      if (this.hand.length === 0) {
        this.isAlive = false;
      }
      return removed;
    }
    return null;
  }

  loseLife(cardIndex) {
      return this.removeCard(cardIndex);
  }
}

module.exports = Player;
