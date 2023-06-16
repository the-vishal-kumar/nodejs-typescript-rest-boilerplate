type EnumType<T> = {
  [K in keyof T]: T[K] extends string | number ? T[K] : never;
};

const Enum = <T extends EnumType<T>>(baseEnum: T): Readonly<T> => {
  return new Proxy(baseEnum, {
    get: (_, name): T => {
      const propName = name.toString() as keyof T;
      if (!baseEnum.hasOwnProperty(propName)) {
        throw new Error(`"${propName.toString()}" value does not exist in the enum`);
      }
      return baseEnum[propName];
    },
    set: (): never => {
      throw new Error('Cannot modify or add a new value to the enum');
    },
  }) as Readonly<T>;
};

export default Enum;
