export class Person {
  private constructor(
    private readonly name: string,
    private readonly surname: string,
  ) {}
  static create(name: string, surname: string): Person {
    if (!name || name.trim() === '') {
      throw new Error('Name cannot be empty');
    }
    if (!surname || surname.trim() === '') {
      throw new Error('Surname cannot be empty');
    }
    return new Person(name, surname);
  }
  public get value(): string {
    return `${this.name} ${this.surname}`;
  }
  public get firstName(): string {
    return this.name;
  }
  public get lastName(): string {
    return this.surname;
  }
  static equals(person1: Person, person2: Person): boolean {
    return person1.value === person2.value;
  }
}
