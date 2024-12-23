import { Big, BigSource, RoundingMode } from 'big.js';

type DecimalBigSource = DecimalBig | BigSource;

export class DecimalBig extends Big {
  static fromBigint(value: bigint, decimals: number) {
    const valueString = value.toString();
    const valueDecimals = valueString.length - decimals;

    let valueBig = new Big(valueString);

    if (valueDecimals > 0) {
      valueBig = valueBig.div(new Big(10).pow(valueDecimals));
    } else if (valueDecimals < 0) {
      valueBig = valueBig.times(new Big(10).pow(-valueDecimals));
    }

    return new DecimalBig(valueBig, decimals);
  }

  private _decimals: number;
  get decimals() {
    return this._decimals;
  }

  get bigint() {
    return BigInt(this.toString().replace('.', ''));
  }

  constructor(value: DecimalBigSource, decimals?: number) {
    super(value);
    this._decimals = decimals ?? this.getDecimalsFromValue(value);
  }

  private getDecimalsFromValue(value: DecimalBigSource) {
    if (value instanceof DecimalBig) {
      return value.decimals;
    }

    return value.toString().split('.')[1]?.length ?? 0;
  }

  setDecimals(decimals: number) {
    this._decimals = decimals;
    return this;
  }

  format(n = this.decimals) {
    return this.toFixed(n);
  }

  // ⬇️ Override Big methods to return DecimalBig

  toFixed(n = this.decimals) {
    return super.toFixed(n);
  }

  plus(n: BigSource): DecimalBig {
    return new DecimalBig(super.plus(n), this.decimals);
  }

  minus(n: BigSource): DecimalBig {
    return new DecimalBig(super.minus(n), this.decimals);
  }

  times(n: BigSource): DecimalBig {
    return new DecimalBig(super.times(n), this.decimals);
  }

  mul(n: BigSource): DecimalBig {
    return new DecimalBig(super.mul(n), this.decimals);
  }

  div(n: BigSource): DecimalBig {
    return new DecimalBig(super.div(n), this.decimals);
  }

  abs(): DecimalBig {
    return new DecimalBig(super.abs(), this.decimals);
  }

  pow(n: number): DecimalBig {
    return new DecimalBig(super.pow(n), this.decimals);
  }

  prec(sd: number, rm?: RoundingMode): DecimalBig {
    return new DecimalBig(super.prec(sd, rm), this.decimals);
  }

  sqrt(): DecimalBig {
    return new DecimalBig(super.sqrt(), this.decimals);
  }

  round(dp: number, rm?: RoundingMode): DecimalBig {
    return new DecimalBig(super.round(dp, rm), this.decimals);
  }

  sub(n: BigSource): DecimalBig {
    return new DecimalBig(super.sub(n), this.decimals);
  }
}
