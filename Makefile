# make test: run the ERT tests in test/ with e8 --batch, as CI does.
# make types: type-check the package against the E8 on PATH.
# E8=/path/to/e8 make test, to use another E8.

E8 ?= e8
TESTS := $(wildcard test/*-tests.ts)
# Packages the package requires, and those only its tests load, each
# owner/repository@tag, cloned into .e8/deps for the tests and tsc.
DEPS := e8-editor/e8-magit-section@v0.1.0 e8-editor/e8-vertico@v0.1.0
DEP_DIRS := $(foreach d,$(DEPS),.e8/deps/$(notdir $(firstword $(subst @, ,$(d)))))
.PHONY: test types deps

test: deps
	$(E8) --batch -L . $(foreach d,$(DEP_DIRS),-L $(d)) $(foreach t,$(TESTS),-l $(t)) -f ert-run-tests-batch-and-exit

types: deps
	$(E8) --print-types .e8
	tsc -p .

deps:
	@for d in $(DEPS); do \
	  repo=$$(echo "$$d" | cut -d@ -f1); tag=$$(echo "$$d" | cut -d@ -f2); \
	  dir=.e8/deps/$$(basename "$$repo"); \
	  [ -e "$$dir" ] || git clone -q --depth 1 --branch "$$tag" "https://github.com/$$repo" "$$dir" || exit 1; \
	done
