function createSemaphore(maxConcurrency: number) {
    let currentConcurrency = 0
    const queue: (() => void)[] = []

    const acquire = async (): Promise<void> => {
        if (currentConcurrency < maxConcurrency) {
            currentConcurrency++
            return
        }

        return new Promise<void>((resolve) => {
            queue.push(resolve)
        })
    }

    const release = (): void => {
        if (queue.length > 0) {
            const next = queue.shift()
            if (next) next()
        } else {
            currentConcurrency--
        }
    }

    return {acquire, release}
}

export async function runWithConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number
): Promise<T[]> {
    const {acquire, release} = createSemaphore(concurrency)
    const results: T[] = []

    const runTask = async (task: () => Promise<T>): Promise<void> => {
        await acquire()
        try {
            const result = await task()
            results.push(result)
        } finally {
            release()
        }
    }

    await Promise.all(tasks.map((task) => runTask(task)))
    return results
}
