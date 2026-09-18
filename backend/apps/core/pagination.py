"""Consistent pagination for list endpoints."""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """Page-based pagination exposing ``count``, ``next``, ``previous`` pages.

    Guarantees a stable, predictable JSON envelope for every list resource::

        {
          "count": 42,
          "next": "http://.../?page=2",
          "previous": null,
          "results": [...]
        }
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )
