from fastapi import Request

from .store import Store


def get_store(request: Request) -> Store:
    return request.app.state.store
