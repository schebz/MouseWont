#!/bin/bash

# Run all unit tests and generate coverage report

echo "Running all unit tests..."
npm test

if [ $? -ne 0 ]; then
  echo "Unit tests failed. Exiting."
  exit 1
fi

echo "Generating coverage report..."
npm run test:coverage

echo "All tests completed successfully."