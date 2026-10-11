
const asynhandler = (requesthandler) => {
    return (req, res, next) => {
        Promise
            .resolve(requesthandler(req, res, next))
            .catch(next);
    }

}
export { asynhandler };