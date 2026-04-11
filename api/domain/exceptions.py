class NotFoundError(Exception):
    def __init__(self, entity: str, entity_id: str):
        self.entity = entity
        self.entity_id = entity_id
        super().__init__(f"{entity} with id {entity_id} not found")


class ForbiddenError(Exception):
    def __init__(self, message: str = "Operation not allowed"):
        super().__init__(message)


class DomainException(Exception):
    def __init__(self, message: str):
        super().__init__(message)
