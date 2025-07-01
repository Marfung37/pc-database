export class Fraction {
  numerator: number;
  denominator: number;

  constructor(
    numerator: number,
    denominator: number
  ) {
    if (denominator == 0) {
      throw new Error("Denominator is zero");
    }
    this.numerator = numerator;
    this.denominator = denominator;
  }

  public toString() {
    return `${this.numerator}/${this.denominator}`
  }
}
