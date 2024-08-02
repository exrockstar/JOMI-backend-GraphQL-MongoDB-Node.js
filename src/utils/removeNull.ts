export function removeNull(values: string[]): string[] {
    return values.filter(value => !!value);
}