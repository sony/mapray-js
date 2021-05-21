
const snakeToCamel = (snake) => {
    return snake.replace(
        new RegExp("(_?)([^_])([^_]*)", "g"),
        (matched, underscore, first_char, others) => (
            (underscore ? " " : "") + first_char.toUpperCase() + others.toLowerCase()
        )
    )
}

export { snakeToCamel };
